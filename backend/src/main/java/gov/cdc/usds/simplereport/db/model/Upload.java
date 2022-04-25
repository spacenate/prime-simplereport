package gov.cdc.usds.simplereport.db.model;

import gov.cdc.usds.simplereport.db.model.auxiliary.UploadStatus;
import java.util.UUID;
import javax.persistence.*;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.hibernate.annotations.Type;

@Getter
@Entity
@Slf4j
public class Upload extends AuditedEntity {

  @Column private UUID reportId;

  @Column
  @Type(type = "pg_enum")
  @Enumerated(EnumType.STRING)
  private UploadStatus Status;

  @Column private int recordsCount;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "org_id")
  private Organization organization;

  @ManyToOne(optional = false, fetch = FetchType.LAZY)
  @JoinColumn(name = "facility_id")
  private Facility facility;

  @Column private String warnings;

  @Column private String errors;
}
